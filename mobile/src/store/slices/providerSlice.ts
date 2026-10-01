import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api, getErrorMessage } from '../../services/api';

export interface NearbyProvider {
  provider_id: number;
  user_id: number;
  name: string;
  phone?: string;
  category: string;
  sub_categories: string[];
  skills_description?: string;
  distance_km: number;
  rating: number;
  total_bookings: number;
  photo_url: string | null;
  is_online: boolean;
}

interface ProviderState {
  nearbyProviders: NearbyProvider[];
  selectedProvider: NearbyProvider | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ProviderState = {
  nearbyProviders: [],
  selectedProvider: null,
  isLoading: false,
  error: null,
};

export const searchNearby = createAsyncThunk(
  'provider/searchNearby',
  async (
    params: {
      lat: number;
      lng: number;
      category?: string;
      skill?: string;
      radius_km?: number;
      district?: string;
      state?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const res = await api.get('/api/customer/search-nearby', { params });
      return res.data as NearbyProvider[];
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

const providerSlice = createSlice({
  name: 'provider',
  initialState,
  reducers: {
    selectProvider: (state, action: PayloadAction<NearbyProvider>) => {
      state.selectedProvider = action.payload;
    },
    clearProviders: (state) => {
      state.nearbyProviders = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchNearby.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchNearby.fulfilled, (state, action) => {
        state.isLoading = false;
        state.nearbyProviders = action.payload;
      })
      .addCase(searchNearby.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { selectProvider, clearProviders, clearError } = providerSlice.actions;
export default providerSlice.reducer;
