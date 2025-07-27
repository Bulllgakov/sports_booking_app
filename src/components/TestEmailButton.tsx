import React, { useState } from 'react';
import { 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Box
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { testEmailExtension } from '../utils/testEmail';

interface TestEmailButtonProps {
  defaultEmail?: string;
}

const TestEmailButton: React.FC<TestEmailButtonProps> = ({ defaultEmail = '' }) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendTest = async () => {
    if (!email || !email.includes('@')) {
      setResult({ success: false, message: 'Введите корректный email' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await testEmailExtension(email);
      setResult({ 
        success: true, 
        message: `Тестовое письмо отправлено на ${email}` 
      });
    } catch (error: any) {
      setResult({ 
        success: false, 
        message: error.message || 'Ошибка при отправке' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<SendIcon />}
        onClick={() => setOpen(true)}
        size="small"
      >
        Тест Email
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Тестирование отправки Email</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Email для теста"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              helperText="Введите email, на который будет отправлено тестовое письмо"
            />
            
            {result && (
              <Alert 
                severity={result.success ? 'success' : 'error'} 
                sx={{ mt: 2 }}
              >
                {result.message}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={loading}>
            Отмена
          </Button>
          <Button 
            onClick={handleSendTest} 
            variant="contained" 
            disabled={loading || !email}
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {loading ? 'Отправка...' : 'Отправить'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TestEmailButton;