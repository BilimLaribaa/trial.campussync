import { CONFIG } from 'src/config-global';

import { FeesView } from 'src/sections/fees';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Fees - ${CONFIG.appName}`}</title>

      <FeesView />
    </>
  );
}
