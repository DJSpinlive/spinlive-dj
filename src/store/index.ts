import "./api/authApi";

import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage";

// Import your API slices
import { baseSlice } from "./api/apiSlice";
// Import your feature slices
import authSlice from "./slices/authSlice";
import userSlice from "./slices/userSlice";

const authPersistConfig = {
  key: "auth",
  storage,
};

// Root reducer
const rootReducer = combineReducers({
  [baseSlice.reducerPath]: baseSlice.reducer,
  auth: persistReducer(authPersistConfig, authSlice),
  user: userSlice,
});

// Configure store
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }).concat(baseSlice.middleware),
  devTools: process.env.NODE_ENV !== "production",
});

// Setup listeners for RTK Query
setupListeners(store.dispatch);

// Persistor
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
