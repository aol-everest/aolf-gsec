import React from 'react';
import { Container, Typography, Paper, Box, List, ListItem, ListItemText } from '@mui/material';

const DignitaryList: React.FC = () => {
  // TODO: Fetch this data from API
  const dignitaries = [
    { id: 1, name: 'Sri Sri Ravi Shankar', role: 'Founder' },
    { id: 2, name: 'John Doe', role: 'Senior Teacher' },
    { id: 3, name: 'Jane Smith', role: 'Director' },
  ];

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dignitaries
        </Typography>
        <Paper>
          <List>
            {dignitaries.map((dignitary) => (
              <ListItem key={dignitary.id} divider>
                <ListItemText
                  primary={dignitary.name}
                  secondary={dignitary.role}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>
    </Container>
  );
};

export default DignitaryList; 