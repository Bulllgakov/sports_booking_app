import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import { Upgrade, Check, Warning } from '@mui/icons-material'
import { usePermission } from '../../hooks/usePermission'
import { migrateSubscriptionPlans } from '../../utils/migrateSubscriptions'

export default function MigrationTools() {
  const { isSuperAdmin } = usePermission()
  const [migrating, setMigrating] = useState(false)
  const [migrationResult, setMigrationResult] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  if (!isSuperAdmin) {
    return (
      <Alert severity="error">
        Доступ запрещен. Эта страница доступна только суперадминистраторам.
      </Alert>
    )
  }

  const handleMigrate = async () => {
    setDialogOpen(false)
    setMigrating(true)
    setMigrationResult(null)
    
    try {
      const result = await migrateSubscriptionPlans()
      setMigrationResult(result)
    } catch (error) {
      console.error('Ошибка миграции:', error)
      setMigrationResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      })
    } finally {
      setMigrating(false)
    }
  }

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Инструменты миграции
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Миграция тарифных планов
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            Эта миграция обновит старые названия тарифов на новые:
            <List dense>
              <ListItem>
                <ListItemText primary="СТАРТ → БАЗОВЫЙ" />
              </ListItem>
              <ListItem>
                <ListItemText primary="СТАНДАРТ → CRM" />
              </ListItem>
            </List>
          </Alert>

          {migrationResult && (
            <Alert 
              severity={migrationResult.success ? 'success' : 'error'} 
              sx={{ mb: 2 }}
            >
              {migrationResult.success ? (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Миграция завершена успешно!
                  </Typography>
                  <Typography variant="body2">
                    ✅ Обновлено: {migrationResult.updated} подписок<br />
                    ⏭️ Пропущено: {migrationResult.skipped} подписок<br />
                    📝 Всего обработано: {migrationResult.total} подписок
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Ошибка миграции
                  </Typography>
                  <Typography variant="body2">
                    {migrationResult.error}
                  </Typography>
                </Box>
              )}
            </Alert>
          )}

          {migrating ? (
            <Box sx={{ width: '100%', mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Выполняется миграция...
              </Typography>
              <LinearProgress />
            </Box>
          ) : (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Upgrade />}
              onClick={() => setDialogOpen(true)}
              disabled={migrationResult?.success}
            >
              Запустить миграцию
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Warning color="warning" />
            Подтверждение миграции
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Вы уверены, что хотите запустить миграцию тарифных планов?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Это действие обновит все подписки со старыми названиями тарифов 
            (СТАРТ и СТАНДАРТ) на новые (БАЗОВЫЙ и CRM).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Отмена
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleMigrate}
            startIcon={<Check />}
          >
            Подтвердить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}