"use client";

import { useRouter } from "next/navigation";
import { Box, Button, Card, CardContent, Grid, Typography } from "@mui/material";

export default function PortalSelectPage() {
  const router = useRouter();

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Choose Your Portal</Typography>
      <Grid container spacing={2}>
        {["INF", "JNF"].map((type) => (
          <Grid key={type} size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h5">{type} Portal</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Continue with {type} workflow and form schema.
                </Typography>
                <Button variant="contained" onClick={() => router.push("/login")}>Continue</Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
