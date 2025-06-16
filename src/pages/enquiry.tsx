import { CONFIG } from 'src/config-global';

import { EnquiryView } from 'src/sections/enquiry';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Student - ${CONFIG.appName}`}</title>

      <EnquiryView />
    </>
  );
}
