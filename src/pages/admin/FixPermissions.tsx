import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  Alert, 
  CircularProgress,
  Chip
} from '@mui/material';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { usePermission } from '../../hooks/usePermission';

const rolePermissions = {
  admin: [
    'manage_bookings',
    'manage_courts',
    'manage_club',
    'manage_admins',
    'manage_finance',
    'view_reports',
    'create_bookings'
  ],
  manager: [
    'view_bookings',
    'create_bookings',
    'view_reports'
  ]
};

export default function FixPermissions() {
  const { isSuperAdmin } = usePermission();
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [fixedCount, setFixedCount] = useState(0);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const adminsSnapshot = await getDocs(collection(db, 'admins'));
      const adminsData = adminsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAdmins(adminsData);
    } catch (error) {
      console.error('Error loading admins:', error);
      setMessage({ type: 'error', text: 'Ошибка при загрузке администраторов' });
    } finally {
      setLoading(false);
    }
  };

  const fixPermissions = async () => {
    try {
      setLoading(true);
      setMessage(null);
      let count = 0;

      for (const admin of admins) {
        if (admin.role === 'admin' || admin.role === 'manager') {
          const requiredPermissions = rolePermissions[admin.role];
          const currentPermissions = admin.permissions || [];
          
          const missingPermissions = requiredPermissions.filter(
            p => !currentPermissions.includes(p)
          );

          if (missingPermissions.length > 0) {
            const updatedPermissions = [...new Set([...currentPermissions, ...requiredPermissions])];
            
            await updateDoc(doc(db, 'admins', admin.id), {
              permissions: updatedPermissions,
              updatedAt: new Date()
            });
            
            count++;
            console.log(`Updated ${admin.name} (${admin.email}): added ${missingPermissions.join(', ')}`);
          }
        }
      }

      setFixedCount(count);
      if (count > 0) {
        setMessage({ 
          type: 'success', 
          text: `Успешно обновлено ${count} администратор(ов). Обновите страницу и попробуйте войти снова.` 
        });
      } else {
        setMessage({ 
          type: 'info', 
          text: 'Все администраторы уже имеют необходимые права.' 
        });
      }
      
      // Reload admins to show updated state
      await loadAdmins();
    } catch (error) {
      console.error('Error fixing permissions:', error);
      setMessage({ type: 'error', text: 'Ошибка при обновлении прав доступа' });
    } finally {
      setLoading(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <Alert severity="error">
        Доступ запрещен. Эта страница доступна только суперадминистраторам.
      </Alert>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Исправление прав доступа администраторов
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Эта страница позволяет исправить права доступа для существующих администраторов клубов.
        Нажмите кнопку ниже, чтобы автоматически добавить недостающие права.
      </Alert>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }}>
          {message.text}
        </Alert>
      )}

      <Button 
        variant="contained" 
        color="primary" 
        onClick={fixPermissions}
        disabled={loading}
        sx={{ mb: 3 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Исправить права доступа'}
      </Button>

      <Typography variant="h6" gutterBottom>
        Текущие администраторы:
      </Typography>

      {loading && !admins.length ? (
        <CircularProgress />
      ) : (
        <Box display="flex" flexDirection="column" gap={2}>
          {admins.map(admin => (
            <Card key={admin.id}>
              <CardContent>
                <Typography variant="h6">
                  {admin.name} ({admin.email})
                </Typography>
                <Typography color="textSecondary" gutterBottom>
                  Роль: <Chip label={admin.role} size="small" color={admin.role === 'admin' ? 'primary' : 'default'} />
                </Typography>
                <Typography variant="body2">
                  Текущие права: {admin.permissions?.join(', ') || 'Нет прав'}
                </Typography>
                {admin.role === 'admin' && !admin.permissions?.includes('manage_club') && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    У этого администратора отсутствует право "manage_club" для управления клубом!
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}