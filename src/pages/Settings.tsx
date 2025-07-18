import React from 'react'
import { 
  Box, 
  Typography, 
  Card, 
  CardContent,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material'
import { 
  Business, 
  Payment, 
  Notifications, 
  Security,
  Language,
  Schedule
} from '@mui/icons-material'

const Settings: React.FC = () => {
  const settingsItems = [
    {
      icon: <Business />,
      title: 'Настройки клуба',
      description: 'Информация о клубе, логотип, контакты',
      disabled: false
    },
    {
      icon: <Payment />,
      title: 'Платежи и эквайринг',
      description: 'Подключение платежных систем',
      disabled: true
    },
    {
      icon: <Notifications />,
      title: 'Уведомления',
      description: 'SMS и Email рассылки клиентам',
      disabled: true
    },
    {
      icon: <Schedule />,
      title: 'Расписание работы',
      description: 'Часы работы клуба и кортов',
      disabled: true
    },
    {
      icon: <Language />,
      title: 'Язык и регион',
      description: 'Настройки локализации',
      disabled: true
    },
    {
      icon: <Security />,
      title: 'Безопасность',
      description: 'Пароли и доступы сотрудников',
      disabled: true
    }
  ]

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Настройки
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        В демо-версии доступны только настройки клуба. Остальные функции доступны после регистрации.
      </Alert>

      <Card>
        <CardContent>
          <List>
            {settingsItems.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && <Divider />}
                <ListItem 
                  button={!item.disabled}
                  disabled={item.disabled}
                  onClick={() => !item.disabled && alert('Переход в настройки клуба')}
                >
                  <ListItemIcon sx={{ color: item.disabled ? 'text.disabled' : 'primary.main' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    secondary={item.description}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>
    </Box>
  )
}

export default Settings