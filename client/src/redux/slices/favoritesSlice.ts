import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { favoritesService } from '@/services/favoritesService';
import type { IMenuItem } from '@/types';

interface FavoritesState {
    /** Ids, for the heart state on every dish card. */
    ids: string[];
    /** Full dishes, for rendering the favourites list on the home screen. */
    items: IMenuItem[];
    loaded: boolean;
    loading: boolean;
}

const initialState: FavoritesState = { ids: [], items: [], loaded: false, loading: false };

export const fetchFavorites = createAsyncThunk('favorites/fetch', async () => favoritesService.list());

export const toggleFavorite = createAsyncThunk(
    'favorites/toggle',
    async (menuItemId: string) => {
        const res = await favoritesService.toggle(menuItemId);
        return { menuItemId, ...res };
    }
);

const favoritesSlice = createSlice({
    name: 'favorites',
    initialState,
    reducers: {
        resetFavorites: () => initialState,
        /**
         * Flip the heart before the request lands. The server returns the true
         * state and the fulfilled case overwrites this, so a failed call simply
         * leaves the pre-request value in place on the next fetch.
         */
        optimisticToggle: (state, action: { payload: string }) => {
            const id = action.payload;
            state.ids = state.ids.includes(id) ? state.ids.filter((f) => f !== id) : [...state.ids, id];
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchFavorites.pending, (state) => { state.loading = true; })
            .addCase(fetchFavorites.fulfilled, (state, action) => {
                state.loading = false;
                state.loaded = true;
                state.ids = action.payload.favorites;
                state.items = action.payload.menuItems;
            })
            .addCase(fetchFavorites.rejected, (state) => { state.loading = false; state.loaded = true; })
            .addCase(toggleFavorite.fulfilled, (state, action) => {
                state.ids = action.payload.favorites;
                if (!action.payload.isFavorite) {
                    state.items = state.items.filter((i) => i._id !== action.payload.menuItemId);
                } else {
                    // The full dish arrives with the next list fetch; the id is
                    // enough to light the heart everywhere in the meantime.
                    state.loaded = false;
                }
            });
    },
});

export const { resetFavorites, optimisticToggle } = favoritesSlice.actions;
export default favoritesSlice.reducer;
