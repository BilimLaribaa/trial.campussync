import { CONFIG } from 'src/config-global';

import { StudentFeesView } from 'src/sections/fees';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Student Fees - ${CONFIG.appName}`}</title>
      <StudentFeesView />
    </>
  );
}