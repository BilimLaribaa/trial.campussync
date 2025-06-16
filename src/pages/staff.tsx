import { CONFIG } from 'src/config-global';

import { StaffView } from 'src/sections/staff';

// ----------------------------------------------------------------------

export default function StaffPage() {
  return (
    <>
      <title>{`Staff - ${CONFIG.appName}`}</title>
      <meta
        name="description"
        content="Manage staff members"
      />

      <StaffView />
    </>
  );
}
