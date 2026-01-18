import type { AppType } from "next/app";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "~/styles/globals.css";

const MyApp: AppType = ({ Component, pageProps }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
    </QueryClientProvider>
  );
};

export default MyApp;
