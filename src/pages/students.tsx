import { CONFIG } from 'src/config-global';

import { StudentView } from 'src/sections/student/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Student - ${CONFIG.appName}`}</title>

      <StudentView />
    </>
  );
}
