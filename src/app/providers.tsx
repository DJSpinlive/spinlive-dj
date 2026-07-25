"use client";

import { ReactNode } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import StreamMiniPlayer from "@/components/studio/golive/StreamMiniPlayer";
import { StreamSessionProvider } from "@/components/studio/golive/StreamSessionProvider";
import { persistor, store } from "@/store";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {/* Lives above the pages so the DJ's capture devices, broadcast and
            chat survive route changes; the mini player floats on every page
            except the go-live studio while a stream is live. */}
        <StreamSessionProvider>
          {children}
          <StreamMiniPlayer />
        </StreamSessionProvider>
      </PersistGate>
    </Provider>
  );
}
