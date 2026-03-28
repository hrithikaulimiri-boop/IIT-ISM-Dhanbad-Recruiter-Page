"use client";

import { Card, CardContent, Typography, Box } from "@mui/material";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";

const data = [
  { month: "Jan", apps: 40 },
  { month: "Feb", apps: 82 },
  { month: "Mar", apps: 121 },
  { month: "Apr", apps: 156 },
];

export default function AnalyticsChart() {
  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Application Trend</Typography>
        <Box sx={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <AreaChart data={data}>
              <XAxis dataKey="month" />
              <Tooltip />
              <Area type="monotone" dataKey="apps" stroke="#6366F1" fill="#A78BFA" />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
