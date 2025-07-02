import { useState, useRef, ReactNode } from 'react';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  CircularProgress,
} from '@mui/material';

import { printContent } from '../utils/print';

interface PrintDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  printData?: string | HTMLElement;
  onBeforePrint?: () => Promise<void>;
}

export function PrintDialog({
  open,
  onClose,
  title = 'Print Preview',
  children,
  printData,
  onBeforePrint,
}: PrintDialogProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      
      if (onBeforePrint) {
        await onBeforePrint();
      }

      const contentToPrint = printData || previewRef.current;
      if (contentToPrint) {
        await printContent(contentToPrint);
      }
    } catch (error) {
      console.error('Print error:', error);
      // You might want to show an error toast here
    } finally {
      setIsPrinting(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box ref={previewRef} className="print-content">
          {children || (printData && typeof printData === 'string' ? (
            <div dangerouslySetInnerHTML={{ __html: printData }} />
          ) : null)}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPrinting}>
          Cancel
        </Button>
        <Button
          onClick={handlePrint}
          variant="contained"
          color="primary"
          disabled={isPrinting}
          startIcon={isPrinting ? <CircularProgress size={20} /> : null}
        >
          {isPrinting ? 'Printing...' : 'Print'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}