"use client";

import React from 'react';
import { Fab, Tooltip, Zoom } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useRouter } from 'next/navigation';

const HelpFab = () => {
  const router = useRouter();

  return (
    <Zoom in={true}>
      <Tooltip title="Are you lost? Get help here!" placement="left">
        <Fab
          color="primary"
          aria-label="help"
          onClick={() => router.push('/help')}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 84, // Offset to avoid overlapping with theme toggle
            zIndex: 1301,
            boxShadow: 4,
            '&:hover': {
              transform: 'scale(1.1)',
            },
            transition: 'transform 0.2s',
          }}
        >
          <HelpOutlineIcon />
        </Fab>
      </Tooltip>
    </Zoom>
  );
};

export default HelpFab;
