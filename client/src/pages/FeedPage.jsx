import React from 'react';
import { Container, Typography } from '@mui/material';
import FeedList from '../components/FeedList';

function FeedPage() {
  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" sx={{ mt: 4, mb: 3 }}>
        Feed
      </Typography>
      <FeedList />
    </Container>
  );
}

export default FeedPage;
