import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { MenuState, IMenuItem, IRestaurant, IOffer } from '@/types';
import { menuService } from '@/services/menuService';

const initialState: MenuState = {
    items: [],
    restaurant: null,
    offers: [],
    categories: [],
    loading: false,
    error: null,
};

export const fetchRestaurant = createAsyncThunk(
    'menu/fetchRestaurant',
    async (_, { rejectWithValue }) => {
        try {
            const data = await menuService.getRestaurantInfo();
            return data;
        } catch (err) {
            return rejectWithValue((err as Error).message);
        }
    }
);

export const fetchMenuItems = createAsyncThunk(
    'menu/fetchMenuItems',
    async (params: Record<string, string | number | boolean | undefined>, { rejectWithValue }) => {
        try {
            const data = await menuService.getMenuItems(params);
            return data;
        } catch (err) {
            return rejectWithValue((err as Error).message);
        }
    }
);

export const fetchOffers = createAsyncThunk(
    'menu/fetchOffers',
    async (_, { rejectWithValue }) => {
        try {
            const data = await menuService.getOffers();
            return data;
        } catch (err) {
            return rejectWithValue((err as Error).message);
        }
    }
);

const menuSlice = createSlice({
    name: 'menu',
    initialState,
    reducers: {
        setCategories(state, action: PayloadAction<string[]>) {
            state.categories = action.payload;
        },
        clearError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Restaurant
        builder
            .addCase(fetchRestaurant.pending, (state) => { state.loading = true; })
            .addCase(fetchRestaurant.fulfilled, (state, action: PayloadAction<IRestaurant>) => {
                state.restaurant = action.payload;
                state.loading = false;
            })
            .addCase(fetchRestaurant.rejected, (state, action) => {
                state.error = action.payload as string;
                state.loading = false;
            });

        // Menu items
        builder
            .addCase(fetchMenuItems.pending, (state) => { state.loading = true; })
            .addCase(fetchMenuItems.fulfilled, (state, action: PayloadAction<IMenuItem[]>) => {
                state.items = action.payload;
                // Auto-derive categories
                const cats = [...new Set(action.payload.map((i) => i.category))];
                state.categories = cats;
                state.loading = false;
            })
            .addCase(fetchMenuItems.rejected, (state, action) => {
                state.error = action.payload as string;
                state.loading = false;
            });

        // Offers
        builder
            .addCase(fetchOffers.fulfilled, (state, action: PayloadAction<IOffer[]>) => {
                state.offers = action.payload;
            });
    },
});

export const { setCategories, clearError } = menuSlice.actions;
export default menuSlice.reducer;
