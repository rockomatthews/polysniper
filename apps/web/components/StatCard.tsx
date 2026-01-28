import { Paper, Stack, Typography } from "@mui/material";

type StatCardProps = {
  label: string;
  value: string;
  helper?: string;
};

export const StatCard = ({ label, value, helper }: StatCardProps) => (
  <Paper sx={{ p: 3, height: "100%" }}>
    <Stack spacing={1}>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4">{value}</Typography>
      {helper ? (
        <Typography variant="body2" color="text.secondary">
          {helper}
        </Typography>
      ) : null}
    </Stack>
  </Paper>
);
