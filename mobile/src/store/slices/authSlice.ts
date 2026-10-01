import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import { api } from '../../services/api';

export type UserRole = 'customer' | 'provider' | 'admin' | 'agent' | 'sub_admin' | 'labour' | 'karigar' | 'driver' | 'contractor' | 'transport';

interface AuthState {
  token: string | null;
  userId: number | null;
  role: UserRole | null;
  selectedRoles: string[];
  name: string | null;
  phone: string | null;
  isVerified: boolean;
  isLoading: boolean;
  isBootstrapping: boolean; // true jab tak initial SecureStore load na ho jaye
  error: string | null;
  isNewUser: boolean;
  hasProfile: boolean;
}

const initialState: AuthState = {
  token: null,
  userId: null,
  role: null,
  selectedRoles: [],
  name: null,
  phone: null,
  isVerified: false,
  isLoading: false,
  isBootstrapping: true, // Start as true — jab tak token check na ho jaye
  error: null,
  isNewUser: false,
  hasProfile: true,
};

function getErrorMessage(err: any): string {
  if (!err.response) return 'Backend server not reachable. Make sure it is running.';
  return err.response?.data?.detail || 'Something went wrong';
}

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const sendOTP = createAsyncThunk(
  'auth/sendOTP',
  async (phone: string, { rejectWithValue }) => {
    try {
      const res = await api.post('/api/auth/send-otp', { phone });
      return res.data;
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async (
    payload: { phone: string; otp: string; mode?: 'login' | 'signup' },
    { rejectWithValue }
  ) => {
    try {
      // Only login uses this thunk now — signup uses verifySignupOTP + completeSignup
      const res = await api.post('/api/auth/verify-otp', {
        phone: payload.phone,
        otp: payload.otp,
      });
      const { access_token, user_id, role, name, is_new_user, has_profile, selected_roles } = res.data;
      const selectedRoles: string[] = selected_roles || [role, 'customer'];

      await SecureStore.setItemAsync('auth_token', access_token);
      await SecureStore.setItemAsync('auth_phone', payload.phone);
      await SecureStore.setItemAsync('auth_role', role);
      await SecureStore.setItemAsync('auth_name', name || '');
      await SecureStore.setItemAsync('auth_has_profile', has_profile ? 'true' : 'false');
      await SecureStore.setItemAsync('auth_selected_roles', JSON.stringify(selectedRoles));
      if (user_id) await SecureStore.setItemAsync('auth_user_id', user_id.toString());

      return {
        token: access_token,
        userId: user_id,
        role: role as UserRole,
        selectedRoles,
        name,
        phone: payload.phone,
        isNewUser: is_new_user ?? false,
        hasProfile: has_profile ?? true,
      };
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

// Signup Step 2: Verify OTP only — does NOT create user in DB, does NOT save token
export const verifySignupOTP = createAsyncThunk(
  'auth/verifySignupOTP',
  async (payload: { phone: string; otp: string }, { rejectWithValue }) => {
    try {
      const res = await api.post('/api/auth/verify-signup', {
        phone: payload.phone,
        otp: payload.otp,
      });
      // Returns { verified: true, phone }  — no JWT
      return { phone: payload.phone, verified: res.data.verified as boolean };
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

// Signup Step 3: User selects role → user created in DB → JWT returned
export const completeSignup = createAsyncThunk(
  'auth/completeSignup',
  async (payload: { phone: string; role: string; roles?: string[] }, { rejectWithValue }) => {
    try {
      const res = await api.post('/api/auth/complete-signup', {
        phone: payload.phone,
        role: payload.role,
        roles: payload.roles,
      });
      const { access_token, user_id, role, name, is_new_user, has_profile, selected_roles } = res.data;
      const selectedRoles: string[] = selected_roles || [role, 'customer'];

      await SecureStore.setItemAsync('auth_token', access_token);
      await SecureStore.setItemAsync('auth_phone', payload.phone);
      await SecureStore.setItemAsync('auth_role', role);
      await SecureStore.setItemAsync('auth_name', name || '');
      await SecureStore.setItemAsync('auth_has_profile', has_profile ? 'true' : 'false');
      await SecureStore.setItemAsync('auth_selected_roles', JSON.stringify(selectedRoles));
      if (user_id) await SecureStore.setItemAsync('auth_user_id', user_id.toString());

      return {
        token: access_token,
        userId: user_id,
        role: role as UserRole,
        selectedRoles,
        name,
        phone: payload.phone,
        isNewUser: is_new_user ?? true,
        hasProfile: has_profile ?? true,
      };
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const loadStoredToken = createAsyncThunk('auth/loadToken', async () => {
  try {
    const [token, phone, role, name, hasProfileStr, userIdStr, selectedRolesStr] = await Promise.all([
      SecureStore.getItemAsync('auth_token'),
      SecureStore.getItemAsync('auth_phone'),
      SecureStore.getItemAsync('auth_role'),
      SecureStore.getItemAsync('auth_name'),
      SecureStore.getItemAsync('auth_has_profile'),
      SecureStore.getItemAsync('auth_user_id'),
      SecureStore.getItemAsync('auth_selected_roles'),
    ]);
    const hasProfile = hasProfileStr === 'false' ? false : true;
    const userId = userIdStr ? parseInt(userIdStr, 10) : null;
    let selectedRoles: string[] = [];
    try {
      if (selectedRolesStr) selectedRoles = JSON.parse(selectedRolesStr);
    } catch {}
    if (selectedRoles.length === 0 && role) {
      selectedRoles = [role, 'customer'];
    }
    return { token, phone, role: role as UserRole | null, selectedRoles, name, hasProfile, userId };
  } catch {
    return { token: null, phone: null, role: null, selectedRoles: [], name: null, hasProfile: true, userId: null };
  }
});

export const logout = createAsyncThunk('auth/logout', async (_, { getState }) => {
  const state = getState() as any;
  if (state.auth?.token) {
    // Non-blocking fire-and-forget server notification
    api.post('/api/auth/logout', {}).catch(() => {});
  }

  // Clear SecureStore in parallel immediately
  await Promise.all([
    SecureStore.deleteItemAsync('auth_token'),
    SecureStore.deleteItemAsync('auth_phone'),
    SecureStore.deleteItemAsync('auth_role'),
    SecureStore.deleteItemAsync('auth_name'),
    SecureStore.deleteItemAsync('auth_has_profile'),
    SecureStore.deleteItemAsync('auth_user_id'),
    SecureStore.deleteItemAsync('auth_selected_roles'),
  ]);
});

export const updateRole = createAsyncThunk(
  'auth/updateRole',
  async (targetRole: string, { rejectWithValue }) => {
    try {
      const res = await api.post('/api/auth/update-role', { role: targetRole });
      const role = res.data.role || targetRole;
      const token = res.data.access_token;
      const hasProfile = res.data.has_profile ?? (!['customer', 'admin'].includes(role));
      const selectedRoles: string[] | undefined = res.data.selected_roles;

      await SecureStore.setItemAsync('auth_role', role);
      if (token) {
        await SecureStore.setItemAsync('auth_token', token);
      }
      await SecureStore.setItemAsync('auth_has_profile', hasProfile ? 'true' : 'false');
      if (selectedRoles) {
        await SecureStore.setItemAsync('auth_selected_roles', JSON.stringify(selectedRoles));
      }

      return { role: role as UserRole, token, hasProfile, selectedRoles };
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const addUserRole = createAsyncThunk(
  'auth/addUserRole',
  async (newRole: string, { rejectWithValue }) => {
    try {
      const res = await api.post('/api/auth/add-role', { role: newRole });
      const selectedRoles: string[] = res.data.selected_roles;
      if (selectedRoles) {
        await SecureStore.setItemAsync('auth_selected_roles', JSON.stringify(selectedRoles));
      }
      return { selectedRoles };
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
    completeProfile: (state) => {
      state.hasProfile = true;
      SecureStore.setItemAsync('auth_has_profile', 'true').catch(() => {});
    },
    updateProfileName: (state, action) => {
      state.name = action.payload;
      SecureStore.setItemAsync('auth_name', action.payload).catch(() => {});
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendOTP.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(sendOTP.fulfilled, (state) => { state.isLoading = false; })
      .addCase(sendOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(verifyOTP.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(verifyOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.userId = action.payload.userId;
        state.role = action.payload.role;
        state.selectedRoles = action.payload.selectedRoles;
        state.name = action.payload.name;
        state.phone = action.payload.phone;
        state.isNewUser = action.payload.isNewUser;
        state.hasProfile = action.payload.hasProfile;
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(loadStoredToken.pending, (state) => {
        state.isBootstrapping = true;
      })
      .addCase(loadStoredToken.fulfilled, (state, action) => {
        state.isBootstrapping = false;
        state.token = action.payload.token;
        state.phone = action.payload.phone;
        state.role = action.payload.role;
        state.selectedRoles = action.payload.selectedRoles;
        state.name = action.payload.name;
        state.hasProfile = action.payload.hasProfile;
        state.userId = action.payload.userId;
      })
      .addCase(loadStoredToken.rejected, (state) => {
        state.isBootstrapping = false;
      })

      .addCase(logout.fulfilled, (state) => {
        state.token = null;
        state.userId = null;
        state.role = null;
        state.selectedRoles = [];
        state.name = null;
        state.phone = null;
        state.hasProfile = true;
      })
      .addCase(updateRole.fulfilled, (state, action) => {
        state.role = action.payload.role;
        if (action.payload.token) {
          state.token = action.payload.token;
        }
        state.hasProfile = action.payload.hasProfile;
        if (action.payload.selectedRoles) {
          state.selectedRoles = action.payload.selectedRoles;
        }
      })
      .addCase(addUserRole.fulfilled, (state, action) => {
        if (action.payload.selectedRoles) {
          state.selectedRoles = action.payload.selectedRoles;
        }
      })

      .addCase(completeSignup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.userId = action.payload.userId;
        state.role = action.payload.role;
        state.selectedRoles = action.payload.selectedRoles;
        state.name = action.payload.name;
        state.phone = action.payload.phone;
        state.isNewUser = action.payload.isNewUser;
        state.hasProfile = action.payload.hasProfile;
      })
      .addCase(completeSignup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, completeProfile, updateProfileName } = authSlice.actions;
export default authSlice.reducer;
