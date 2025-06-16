import { CONFIG } from 'src/config-global';

import { ClassView } from 'src/sections/class';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Student - ${CONFIG.appName}`}</title>

      <ClassView />
    </>
  );
}
