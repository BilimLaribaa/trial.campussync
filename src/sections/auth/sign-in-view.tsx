import { useState, useCallback,useEffect } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';

import Config from "../../../config";
// ----------------------------------------------------------------------

export function SignInView() {

  


  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showPassword, setShowPassword] = useState(false);

const handleSignIn = async (event: React.FormEvent) => {
  event.preventDefault();

  const formData = new FormData(event.currentTarget as HTMLFormElement);
  const user_email = formData.get('email');
  const user_password = formData.get('password');

  setErrorMsg('');
  setSuccessMsg('');

  try {

  
  const res = await fetch(Config.backend + "/auth/login", {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_email, user_password }),
  });

  const data = await res.json();

  if (data.token) {
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('school_id', data.school_id);
  }

  // ✅ Fix: access school ID directly from `data.data`

  if (res.ok) {
    setSuccessMsg(data.message || 'Login successful');
    setTimeout(() => {
      router.push('/Dashboard');
    }, 1000);
  } else {
    setErrorMsg(data.error || 'Login failed');
  }
} catch (err) {
  console.error('❌ Error during login:', err);
  setErrorMsg('Server error during login');
}
}

async function handlelogout() {

  
        const res = await fetch(Config.backend+"/auth/logout", {
          credentials: 'include',
        });


        
        if (res.ok) {
  
          await res.json();
   
        }
    
}


  const renderForm = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        flexDirection: 'column',
      }}
      component="form"
      onSubmit={handleSignIn}
    >
      <TextField
        fullWidth
        name="email"
        label="Email address"
        defaultValue="admin@campussync.in"
        sx={{ mb: 3 }}
        slotProps={{
          inputLabel: { shrink: true },
        }}
      />

      <Link variant="body2" color="inherit" sx={{ mb: 1.5 }}>
        Forgot password?
      </Link>

      <TextField
        fullWidth
        name="password"
        label="Password"
        defaultValue="4595"
        type={showPassword ? 'text' : 'password'}
        slotProps={{
          inputLabel: { shrink: true },
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                  <Iconify icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        sx={{ mb: 3 }}
      />
{errorMsg && (
  <Box sx={{ mb: 2, width: '100%' }}>
    <Alert severity="error" onClose={() => setErrorMsg('')}>
      {errorMsg}
    </Alert>
  </Box>
)}

{successMsg && (
  <Box sx={{ mb: 2, width: '100%' }}>
    <Alert severity="success" onClose={() => setSuccessMsg('')}>
      {successMsg}
    </Alert>
  </Box>
)}
<Button
  fullWidth
  size="large"
  type="submit" // ✅ must be submit to trigger form submit
  color="inherit"
  variant="contained"
>
  Sign in
</Button>


    </Box>
  );

  return (
    <>
      <Box
        sx={{
          gap: 1.5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mb: 5,
        }}
      >
        <Typography variant="h5">Sign in</Typography>
        
      </Box>
      {renderForm}
      
    </>
  );
}
