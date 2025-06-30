import { CONFIG } from 'src/config-global';

import { IdCardView } from 'src/sections/idcard';

// ----------------------------------------------------------------------

export default function IdCardPage() {
  return (
    <>
      <title>{`ID Cards - ${CONFIG.appName}`}</title>
      <IdCardView />
    </>
  );
}