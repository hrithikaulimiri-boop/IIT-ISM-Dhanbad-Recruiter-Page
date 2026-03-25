"use client";

import { Card, CardContent, Grid, Typography } from "@mui/material";

const cards = [
  { label: "Total Jobs", value: 24 },
  { label: "Active Applications", value: 312 },
  { label: "Recruitment Cycles", value: 3 },
];

export default function KpiCards() {
  return (
    <Grid container spacing={2}>
      {cards.map((card) => (
        <Grid key={card.label} size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">{card.label}</Typography>
              <Typography variant="h4">{card.value}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
