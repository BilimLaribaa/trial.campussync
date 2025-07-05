import JSZip from 'jszip';
import jsPDF from 'jspdf';
import { Rnd } from 'react-rnd';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { useState, useRef } from 'react';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Box, Typography, Button, Stack, Slider, Select, MenuItem, FormControl, InputLabel, TextField, Menu } from '@mui/material';


type Student = {
  id: number;
  gr_number: string;
  roll_number: string;
  full_name: string;
  dob: string;
  gender: string;
  class_id: string;
  section: string;
  blood_group: string;
  passport_photo: string | null;
};

type IDCardPreviewProps = {
  Student: Student[];
  onClearSelection: () => void;
};

export function IDCardPreview({
  Student,
  onClearSelection,
}: IDCardPreviewProps) {

  console.log(Student);
  
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [designUrl, setDesignUrl] = useState<string | null>(null);
  const [photoPosition, setPhotoPosition] = useState({ x: 8, y: 8, width: 64, height: 64 });
  const [previewImgSize, setPreviewImgSize] = useState({ width: 1, height: 1, naturalWidth: 1, naturalHeight: 1 });
  const previewImgRef = useRef<HTMLImageElement | null>(null);
  const [namePosition, setNamePosition] = useState({ x: 8, y: 80, width: 120, height: 32 });
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('DM Sans Variable');
  const [fontColor, setFontColor] = useState('#222');
  const fontFamilies = [
    'DM Sans Variable',
    'Barlow',
    'Arial',
    'Times New Roman',
    'Courier New',
    'Georgia',
    'Verdana',
    'Tahoma',
  ];

  const studentFields = [
    { key: 'full_name', label: 'Full Name' },
    { key: 'gr_number', label: 'GR Number' },
    { key: 'roll_number', label: 'Roll Number' },
    { key: 'class_name', label: 'Class Name' },
    { key: 'address', label: 'Address' },
    { key: 'dob', label: 'Date of Birth' },
    { key: 'contact_number', label: 'Contact Number' },
  ];
  const [selectedField, setSelectedField] = useState('full_name');

  type OverlayConfig = {
    id: number;
    field: keyof Student;
    position: { x: number; y: number };
    fontSize: number;
    fontColor: string;
  };
  const defaultOverlay = (id: number): OverlayConfig => ({
    id,
    field: 'full_name',
    position: { x: 8, y: 80 + id * 40 },
    fontSize: 16,
    fontColor: '#222',
  });
  const [overlays, setOverlays] = useState<OverlayConfig[]>([defaultOverlay(0)]);
  const [overlayId, setOverlayId] = useState(1);

  // Extend Student type for missing fields
  type StudentWithExtras = Student & { class_name?: string; address?: string; contact_number?: string };

  const [contextMenu, setContextMenu] = useState<{ anchorEl: HTMLElement | null; overlayId: number | null }>({ anchorEl: null, overlayId: null });

  const handleDesignUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setDesignFile(file);
      const url = URL.createObjectURL(file);
      setDesignUrl(url);
    }
  };

  // Update photoPosition when user drags/resizes
  // Only update when design is image and Student[0] exists
  const handlePhotoDragStop = (e: any, d: any) => {
    setPhotoPosition((pos) => ({ ...pos, x: d.x, y: d.y }));
  };
  const handlePhotoResize = (e: any, dir: any, ref: any, delta: any, position: any) => {
    setPhotoPosition({
      x: position.x,
      y: position.y,
      width: parseInt(ref.style.width, 10),
      height: parseInt(ref.style.height, 10),
    });
  };
  

  // When the preview image loads, store its rendered and natural size
  const handlePreviewImgLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    setPreviewImgSize({
      width: img.width,
      height: img.height,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
    });
  };

  const handleNameDragStop = (e: any, d: any) => {
    setNamePosition((pos) => ({ ...pos, x: d.x, y: d.y }));
  };
  const handleNameResize = (e: any, dir: any, ref: any, delta: any, position: any) => {
    setNamePosition({
      x: position.x,
      y: position.y,
      width: parseInt(ref.style.width, 10),
      height: parseInt(ref.style.height, 10),
    });
  };

  const handleAddOverlay = () => {
    setOverlays((prev) => [...prev, defaultOverlay(overlayId)]);
    setOverlayId((id) => id + 1);
  };
  const handleOverlayChange = (id: number, changes: Partial<OverlayConfig>) => {
    setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...changes } : o)));
  };
  const handleOverlayPosition = (id: number, pos: { x: number; y: number }) => {
    setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, position: pos } : o)));
  };

  const handleRemoveOverlay = (id: number) => {
    setOverlays((prev) => prev.length > 1 ? prev.filter((o) => o.id !== id) : prev);
  };

  const handleOverlayDoubleClick = (event: React.MouseEvent<HTMLElement>, clickedOverlayId: number) => {
  event.preventDefault();
  setContextMenu({ anchorEl: event.currentTarget as HTMLElement, overlayId: clickedOverlayId });
};
  const handleContextMenuClose = () => {
    setContextMenu({ anchorEl: null, overlayId: null });
  };
  const handleContextMenuFieldChange = (field: keyof Student) => {
    if (contextMenu.overlayId !== null) {
      handleOverlayChange(contextMenu.overlayId, { field });
    }
    handleContextMenuClose();
  };
  const handleContextMenuColorChange = (color: string) => {
    if (contextMenu.overlayId !== null) {
      handleOverlayChange(contextMenu.overlayId, { fontColor: color });
    }
  };
  const handleContextMenuSizeChange = (size: number) => {
    if (contextMenu.overlayId !== null) {
      handleOverlayChange(contextMenu.overlayId, { fontSize: size });
    }
  };

  // Generate all ID cards as PNGs and download as zip
  const handleGenerateAll = async () => {
    if (!designUrl || !designFile?.type.startsWith('image/')) return;
    const zip = new JSZip();
    // Create a hidden container for rendering
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    document.body.appendChild(container);
    for (const student of Student) {
      // Create card div
      const cardDiv = document.createElement('div');
      cardDiv.style.position = 'relative';
      cardDiv.style.display = 'inline-block';
      cardDiv.style.background = '#fff';
      // Design image
      const img = document.createElement('img');
      img.src = designUrl;
      img.style.display = 'block';
      cardDiv.appendChild(img);
      // Wait for image to load to get size
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      // Calculate scale factors
      const scaleX = img.naturalWidth / previewImgSize.width;
      const scaleY = img.naturalHeight / previewImgSize.height;
      // Overlay passport photo
      if (student.passport_photo) {
        const photo = document.createElement('img');
        photo.src = student.passport_photo;
        photo.style.position = 'absolute';
        photo.style.left = (photoPosition.x * scaleX) + 'px';
        photo.style.top = (photoPosition.y * scaleY) + 'px';
        photo.style.width = (photoPosition.width * scaleX) + 'px';
        photo.style.height = (photoPosition.height * scaleY) + 'px';
        photo.style.objectFit = 'cover';
        cardDiv.appendChild(photo);
      }
      // Overlay all selected fields
      overlays.forEach((overlay) => {
        const value = (student as StudentWithExtras)[overlay.field] as string;
        const nameDiv = document.createElement('div');
        nameDiv.innerText = value ?? '';
        nameDiv.style.position = 'absolute';
        nameDiv.style.left = (overlay.position.x * scaleX) + 'px';
        nameDiv.style.top = (overlay.position.y * scaleY) + 'px';
        nameDiv.style.height = (32 * scaleY) + 'px';
        nameDiv.style.display = 'flex';
        nameDiv.style.alignItems = 'center';
        nameDiv.style.justifyContent = 'center';
        nameDiv.style.fontSize = (overlay.fontSize * scaleY) + 'px';
        nameDiv.style.fontFamily = fontFamily;
        nameDiv.style.fontWeight = '600';
        nameDiv.style.color = overlay.fontColor;
        nameDiv.style.textAlign = 'center';
        nameDiv.style.overflow = 'hidden';
        nameDiv.style.textOverflow = 'ellipsis';
        nameDiv.style.whiteSpace = 'nowrap';
        nameDiv.style.padding = '0 8px';
        cardDiv.appendChild(nameDiv);
      });
      // Set cardDiv size to match design image
      cardDiv.style.width = img.naturalWidth + 'px';
      cardDiv.style.height = img.naturalHeight + 'px';
      container.appendChild(cardDiv);
      // Render to PNG
      const canvas = await html2canvas(cardDiv, { backgroundColor: null, useCORS: true, scale: 2 });
      const dataUrl = canvas.toDataURL('image/png');
      zip.file(`${student.full_name.replace(/[^a-zA-Z0-9]/g, '_')}_idcard.png`, dataUrl.split(',')[1], { base64: true });
      container.removeChild(cardDiv);
    }
    document.body.removeChild(container);
    // Download zip
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'idcards.zip');
  };

  // Generate all ID cards as PNGs and download as a single PDF
  const handleGeneratePDF = async () => {
    if (!designUrl || !designFile?.type.startsWith('image/')) return;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    // Create a hidden container for rendering
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    document.body.appendChild(container);
    let first = true;
    for (const student of Student) {
      // Create card div
      const cardDiv = document.createElement('div');
      cardDiv.style.position = 'relative';
      cardDiv.style.display = 'inline-block';
      cardDiv.style.background = '#fff';
      // Design image
      const img = document.createElement('img');
      img.src = designUrl;
      img.style.display = 'block';
      cardDiv.appendChild(img);
      // Wait for image to load to get size
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      // Calculate scale factors
      const scaleX = img.naturalWidth / previewImgSize.width;
      const scaleY = img.naturalHeight / previewImgSize.height;
      // Overlay passport photo
      if (student.passport_photo) {
        const photo = document.createElement('img');
        photo.src = student.passport_photo;
        photo.style.position = 'absolute';
        photo.style.left = (photoPosition.x * scaleX) + 'px';
        photo.style.top = (photoPosition.y * scaleY) + 'px';
        photo.style.width = (photoPosition.width * scaleX) + 'px';
        photo.style.height = (photoPosition.height * scaleY) + 'px';
        photo.style.objectFit = 'cover';
        cardDiv.appendChild(photo);
      }
      // Overlay all selected fields
      overlays.forEach((overlay) => {
        const value = (student as StudentWithExtras)[overlay.field] as string;
        const nameDiv = document.createElement('div');
        nameDiv.innerText = value ?? '';
        nameDiv.style.position = 'absolute';
        nameDiv.style.left = (overlay.position.x * scaleX) + 'px';
        nameDiv.style.top = (overlay.position.y * scaleY) + 'px';
        nameDiv.style.height = (32 * scaleY) + 'px';
        nameDiv.style.display = 'flex';
        nameDiv.style.alignItems = 'center';
        nameDiv.style.justifyContent = 'center';
        nameDiv.style.fontSize = (overlay.fontSize * scaleY) + 'px';
        nameDiv.style.fontFamily = fontFamily;
        nameDiv.style.fontWeight = '600';
        nameDiv.style.color = overlay.fontColor;
        nameDiv.style.textAlign = 'center';
        nameDiv.style.overflow = 'hidden';
        nameDiv.style.textOverflow = 'ellipsis';
        nameDiv.style.whiteSpace = 'nowrap';
        nameDiv.style.padding = '0 8px';
        cardDiv.appendChild(nameDiv);
      });
      // Set cardDiv size to match design image
      cardDiv.style.width = img.naturalWidth + 'px';
      cardDiv.style.height = img.naturalHeight + 'px';
      container.appendChild(cardDiv);
      // Render to PNG
      const canvas = await html2canvas(cardDiv, { backgroundColor: null, useCORS: true, scale: 2 });
      const dataUrl = canvas.toDataURL('image/png');
      // Add to PDF
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      // Fit image to page, keeping aspect ratio
      let imgWidth = img.naturalWidth;
      let imgHeight = img.naturalHeight;
      const maxWidth = pageWidth - 40;
      const maxHeight = pageHeight - 40;
      if (imgWidth > maxWidth) {
        imgHeight = (imgHeight * maxWidth) / imgWidth;
        imgWidth = maxWidth;
      }
      if (imgHeight > maxHeight) {
        imgWidth = (imgWidth * maxHeight) / imgHeight;
        imgHeight = maxHeight;
      }
      if (!first) pdf.addPage();
      pdf.addImage(dataUrl, 'PNG', (pageWidth - imgWidth) / 2, (pageHeight - imgHeight) / 2, imgWidth, imgHeight);
      first = false;
      container.removeChild(cardDiv);
    }
    document.body.removeChild(container);
    pdf.save('idcards.pdf');
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="flex-end" alignItems="center">
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={onClearSelection}
            disabled={Student.length === 0}
          >
            Clear Selection
          </Button>
          <Button
            variant="contained"
            component="label"
          >
            Upload Design
            <input
              type="file"
              accept="image/*,application/pdf"
              hidden
              onChange={handleDesignUpload}
            />
          </Button>
        </Stack>
      </Stack>

      <Box
        sx={{
          mt: 2,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 2,
        }}
      >
        {designUrl && (
          <Box sx={{ overflow: 'auto', maxHeight: 500, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', p: 1, bgcolor: '#fafafa' }}>
            {designFile?.type.startsWith('image/') ? (
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <img
                  ref={previewImgRef}
                  src={designUrl}
                  alt="Design Preview"
                  style={{ display: 'block' }}
                  onLoad={handlePreviewImgLoad}
                />
                {Student[0]?.passport_photo && (
                  <Rnd
                    default={{ x: 8, y: 8, width: 64, height: 64 }}
                    minWidth={32}
                    minHeight={32}
                    maxWidth={200}
                    maxHeight={200}
                    bounds="parent"
                    style={{ zIndex: 2, position: 'absolute' }}
                    position={{ x: photoPosition.x, y: photoPosition.y }}
                    size={{ width: photoPosition.width, height: photoPosition.height }}
                    onDragStop={handlePhotoDragStop}
                    onResize={handlePhotoResize}
                  >
                    <img
                      src={Student[0].passport_photo}
                      alt="Passport Photo"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </Rnd>
                )}
                {/* Field Overlays */}
                {Student[0] && overlays.map((overlay) => {
                  const fieldLabel = studentFields.find(f => f.key === overlay.field)?.label || overlay.field;
                  return (
                    <Rnd
                      key={overlay.id}
                      default={{ x: overlay.position.x, y: overlay.position.y, width: 'auto', height: 32 }}
                      minWidth={40}
                      minHeight={24}
                      maxWidth={undefined}
                      maxHeight={undefined}
                      bounds="parent"
                      style={{ zIndex: 3, position: 'absolute', pointerEvents: 'auto' }}
                      position={{ x: overlay.position.x, y: overlay.position.y }}
                      enableResizing={false}
                      size={undefined}
                      onDragStop={(_, d) => handleOverlayPosition(overlay.id, { x: d.x, y: d.y })}
                      onDoubleClick={(e: React.MouseEvent<HTMLElement>) => handleOverlayDoubleClick(e, overlay.id)}

                    >
                      <Box
                        sx={{
                          width: 'auto',
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'move',
                          px: 1,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: overlay.fontSize,
                            fontFamily: fontFamily,
                            fontWeight: 600,
                            color: overlay.fontColor,
                            textAlign: 'center',
                            width: 'auto',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            userSelect: 'none',
                          }}
                          title={fieldLabel}
                        >
                          {(Student[0] as StudentWithExtras)[overlay.field] as string}
                        </Typography>
                      </Box>
                    </Rnd>
                  );
                })}
                {/* Context menu for changing field */}
                <Menu
                  anchorEl={contextMenu.anchorEl}
                  open={Boolean(contextMenu.anchorEl)}
                  onClose={handleContextMenuClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                >
                  <Box sx={{ px: 2, py: 1, minWidth: 220 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Change Field</Typography>
                    {studentFields.map((field: { key: string; label: string }) => (
                      <MenuItem
                        key={field.key}
                        selected={
                          overlays.find(o => o.id === contextMenu.overlayId)?.field === field.key
                        }
                        onClick={() => handleContextMenuFieldChange(field.key as keyof Student)}
                      >
                        {field.label}
                      </MenuItem>
                    ))}
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Font Color</Typography>
                      <TextField
                        type="color"
                        value={
                          overlays.find(o => o.id === contextMenu.overlayId)?.fontColor || '#222'
                        }
                        onChange={e => handleContextMenuColorChange(e.target.value)}
                        size="small"
                        sx={{ width: 60, minWidth: 60 }}
                        InputLabelProps={{ shrink: true }}
                        variant="outlined"
                      />
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Font Size</Typography>
                      <Slider
                        min={10}
                        max={48}
                        value={
                          overlays.find(o => o.id === contextMenu.overlayId)?.fontSize || 16
                        }
                        onChange={(_, value) => handleContextMenuSizeChange(Number(value))}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                  </Box>
                </Menu>
              </Box>
            ) : designFile?.type === 'application/pdf' ? (
              <embed
                src={designUrl}
                type="application/pdf"
                width="auto"
                height="auto"
                style={{ display: 'block' }}
              />
            ) : null}
          </Box>
        )}
      </Box>

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2, mb: 1 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddOverlay}
          sx={{ minWidth: "100%", height: 40 }}
        >
          Add Field
        </Button>
      </Stack>
      <FormControl size="small" sx={{ width: "100%", mb: 2 }}>
        <InputLabel id="font-family-label">Font Family</InputLabel>
        <Select
          labelId="font-family-label"
          value={fontFamily}
          label="Font Family"
          onChange={(e) => setFontFamily(e.target.value)}
        >
          {fontFamilies.map((family) => (
            <MenuItem key={family} value={family} style={{ fontFamily: family }}>
              {family}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {overlays.map((overlay, idx) => (
        <Stack key={overlay.id} direction="row" spacing={2} alignItems="center" sx={{ mt: 1, mb: 1 }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id={`student-field-label-${overlay.id}`}>Field</InputLabel>
            <Select
              labelId={`student-field-label-${overlay.id}`}
              value={overlay.field}
              label="Field"
              onChange={(e) => handleOverlayChange(overlay.id, { field: e.target.value as keyof Student })}
            >
              {studentFields.map((field) => (
                <MenuItem key={field.key} value={field.key}>
                  {field.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ width: "100%" }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Font Size
            </Typography>
            <Slider
              min={10}
              max={48}
              value={overlay.fontSize}
              onChange={(_, value) => handleOverlayChange(overlay.id, { fontSize: Number(value) })}
              valueLabelDisplay="auto"
            />
          </Box>
          <TextField
            type="color"
            label="Font Color"
            value={overlay.fontColor}
            onChange={(e) => handleOverlayChange(overlay.id, { fontColor: e.target.value })}
            sx={{ width: 80, minWidth: 80 }}
            InputLabelProps={{ shrink: true }}
            variant="outlined"
            size="small"
          />
          <Button
            variant="outlined"
            color="error"
            onClick={() => handleRemoveOverlay(overlay.id)}
            disabled={overlays.length === 1}
            sx={{ minWidth: 40, height: 40 }}
          >
            <DeleteIcon />
          </Button>
        </Stack>
      ))}

    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
      <button
        style={{
          padding: '10px 24px',
          background: '#1976d2',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: 16,
          fontWeight: 500,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(25, 118, 210, 0.08)',
          transition: 'background 0.2s',
        }}
        onClick={handleGenerateAll}
        disabled={!designUrl || !designFile?.type.startsWith('image/') || Student.length === 0}
      >
        Download as ZIP
      </button>
      <button
        style={{
          padding: '10px 24px',
          background: '#388e3c',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: 16,
          fontWeight: 500,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(56, 142, 60, 0.08)',
          transition: 'background 0.2s',
        }}
        onClick={handleGeneratePDF}
        disabled={!designUrl || !designFile?.type.startsWith('image/') || Student.length === 0}
      >
        Download as PDF
      </button>
    </Box>
    </Box>
  );
}