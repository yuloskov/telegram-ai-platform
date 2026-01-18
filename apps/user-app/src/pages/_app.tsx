import type { AppType } from "next/app";
import { useState } from "react";
import { Geist } from "next/font/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "~/i18n";

import "~/styles/globals.css";

const geist = Geist({
  subsets: ["latin"],
});

const MyApp: AppType = ({ Component, pageProps }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <div className={geist.className}>
          <Component {...pageProps} />
        </div>
      </I18nProvider>
    </QueryClientProvider>
  );
};

export default MyApp;
