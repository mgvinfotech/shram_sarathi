import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api, getErrorMessage } from '../../services/api';

export interface Booking {
  id: number;
  provider_id: number;
  category: string;
  status: string;
  created_at: string;
  provider_name?: string;
}

interface BookingState {
  bookings: Booking[];
  currentBooking: Booking | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: BookingState = {
  bookings: [],
  currentBooking: null,
  isLoading: false,
  error: null,
};

export const fetchMyBookings = createAsyncThunk(
  'booking/fetchMine',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/api/customer/bookings');
      return res.data.bookings as Booking[];
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const initiateCall = createAsyncThunk(
  'booking/initiateCall',
  async (bookingId: number, { rejectWithValue }) => {
    try {
      const res = await api.post('/api/call/initiate', null, {
        params: { booking_id: bookingId },
      });
      return res.data;
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setCurrentBooking: (state, action) => {
      state.currentBooking = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyBookings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyBookings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bookings = action.payload;
      })
      .addCase(fetchMyBookings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentBooking, clearError } = bookingSlice.actions;
export default bookingSlice.reducer;
