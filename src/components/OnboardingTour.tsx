import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress
} from '@mui/material'
import {
  SportsTennis,
  Business,
  School,
  CheckCircle,
  RadioButtonUnchecked,
  ArrowForward,
  Celebration,
  Add
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from '../contexts/AuthContext'

interface OnboardingStep {
  title: string
  description: string
  icon: React.ReactElement
  path: string
  buttonText: string
  checklist?: string[]
  completed?: boolean
}

interface OnboardingTourProps {
  forceShow?: boolean
  onClose?: () => void
}

export default function OnboardingTour({ forceShow = false, onClose }: OnboardingTourProps) {
  const navigate = useNavigate()
  const { club, admin } = useAuth()
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [loading, setLoading] = useState(false)

  const steps: OnboardingStep[] = [
    {
      title: '🎾 Добавьте корты',
      description: 'Это самый важный шаг! Без кортов система не будет работать. Добавьте все ваши корты, укажите их типы и настройте расписание работы.',
      icon: <SportsTennis color="primary" fontSize="large" />,
      path: '/admin/courts',
      buttonText: 'Добавить корты',
      checklist: [
        'Добавьте все доступные корты',
        'Укажите тип каждого корта (крытый/открытый)',
        'Настройте расписание работы',
        'Установите цены за час'
      ]
    },
    {
      title: '🏢 Заполните реквизиты',
      description: 'Для прохождения модерации и подключения платежной системы необходимо заполнить реквизиты вашей организации.',
      icon: <Business color="primary" fontSize="large" />,
      path: '/admin/club',
      buttonText: 'Заполнить реквизиты',
      checklist: [
        'Укажите полное название организации',
        'Добавьте ИНН и ОГРН',
        'Заполните юридический адрес',
        'Добавьте банковские реквизиты'
      ]
    },
    {
      title: '👥 Добавьте тренеров',
      description: 'Создайте аккаунты для тренеров, чтобы они могли самостоятельно управлять своим расписанием и ценами.',
      icon: <School color="primary" fontSize="large" />,
      path: '/admin/trainers',
      buttonText: 'Добавить тренеров',
      checklist: [
        'Добавьте всех тренеров клуба',
        'Создайте для них аккаунты',
        'Отправьте им доступы',
        'Тренеры смогут сами управлять расписанием'
      ]
    }
  ]

  useEffect(() => {
    if (forceShow) {
      setOpen(true)
      setCurrentStep(0)
      checkCurrentProgress() // Проверяем текущий прогресс
    } else {
      checkOnboardingStatus()
    }
  }, [club, forceShow])

  const checkCurrentProgress = async () => {
    if (!club || !admin) return
    
    try {
      const venueDoc = await getDoc(doc(db, 'venues', club.id))
      const venueData = venueDoc.data()
      
      // Проверяем, какие шаги уже выполнены
      const completed = []
      
      // Проверка наличия кортов
      const courts = venueData?.courts || []
      if (courts.length > 0) {
        completed.push(0)
      }
      
      // Проверка заполненности реквизитов
      if (venueData?.inn && venueData?.bankAccount) {
        completed.push(1)
      }
      
      // Проверка наличия тренеров
      if (venueData?.trainers && venueData.trainers.length > 0) {
        completed.push(2)
      }
      
      setCompletedSteps(completed)
      
      // Устанавливаем текущий шаг на первый невыполненный
      const nextStep = steps.findIndex((_, index) => !completed.includes(index))
      setCurrentStep(nextStep !== -1 ? nextStep : 0)
    } catch (error) {
      console.error('Error checking current progress:', error)
    }
  }
  
  const checkOnboardingStatus = async () => {
    if (!club || !admin) return

    // Проверяем, является ли админ владельцем клуба и новый ли это клуб
    if (admin.role !== 'admin') return
    
    try {
      const venueDoc = await getDoc(doc(db, 'venues', club.id))
      const venueData = venueDoc.data()
      
      // Проверяем, прошел ли клуб onboarding
      if (venueData?.onboardingCompleted) return
      
      // Проверяем, что клуб создан недавно (в течение последних 7 дней)
      const createdAt = venueData?.createdAt?.toDate()
      const daysSinceCreation = createdAt ? 
        (new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24) : 0
      
      if (daysSinceCreation <= 7 && club.status === 'pending') {
        // Проверяем, какие шаги уже выполнены
        const completed = []
        
        // Проверка наличия кортов
        const courtsQuery = await getDoc(doc(db, 'venues', club.id))
        const courts = venueData?.courts || []
        if (courts.length > 0) {
          completed.push(0)
        }
        
        // Проверка заполненности реквизитов
        if (venueData?.inn && venueData?.bankAccount) {
          completed.push(1)
        }
        
        // Проверка наличия тренеров
        if (venueData?.trainers && venueData.trainers.length > 0) {
          completed.push(2)
        }
        
        setCompletedSteps(completed)
        
        // Показываем onboarding только если не все шаги выполнены
        if (completed.length < steps.length) {
          setOpen(true)
          // Устанавливаем текущий шаг на первый невыполненный
          const nextStep = steps.findIndex((_, index) => !completed.includes(index))
          setCurrentStep(nextStep !== -1 ? nextStep : 0)
        }
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error)
    }
  }

  const handleStepClick = async (stepIndex: number) => {
    const step = steps[stepIndex]
    
    // Отмечаем шаг как просмотренный
    if (!completedSteps.includes(stepIndex)) {
      setCompletedSteps([...completedSteps, stepIndex])
    }
    
    // Переходим на нужную страницу
    navigate(step.path)
    
    // Если это последний шаг, отмечаем onboarding как завершенный
    if (stepIndex === steps.length - 1) {
      await completeOnboarding()
    } else {
      // Переходим к следующему шагу
      setCurrentStep(stepIndex + 1)
    }
  }

  const completeOnboarding = async () => {
    if (!club) return
    
    setLoading(true)
    try {
      await updateDoc(doc(db, 'venues', club.id), {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date()
      })
      setOpen(false)
    } catch (error) {
      console.error('Error completing onboarding:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    if (forceShow) {
      // Если вызвали через кнопку помощи, просто закрываем
      setOpen(false)
      onClose?.()
    } else {
      if (confirm('Вы уверены, что хотите пропустить настройку? Вы можете вернуться к ней позже через меню помощи.')) {
        await completeOnboarding()
      }
    }
  }

  const progress = (completedSteps.length / steps.length) * 100

  return (
    <Dialog 
      open={open} 
      onClose={() => {
        // Позволяем закрыть только если вызвано через кнопку помощи
        if (forceShow) {
          setOpen(false)
          onClose?.()
        }
      }}
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'visible'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Celebration color="primary" />
            <Typography variant="h5" component="span">
              Добро пожаловать в Все Корты!
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Шаг {currentStep + 1} из {steps.length}
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ mt: 2, height: 8, borderRadius: 4 }}
        />
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          Давайте настроим ваш клуб за 3 простых шага. Это займет всего несколько минут!
        </Alert>
        
        <Stepper activeStep={currentStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={index} completed={completedSteps.includes(index)}>
              <StepLabel 
                StepIconComponent={() => (
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: completedSteps.includes(index) 
                        ? 'success.main' 
                        : index === currentStep 
                          ? 'primary.main' 
                          : 'grey.300',
                      color: 'white'
                    }}
                  >
                    {completedSteps.includes(index) ? (
                      <CheckCircle />
                    ) : (
                      <Typography>{index + 1}</Typography>
                    )}
                  </Box>
                )}
              >
                <Typography variant="h6">{step.title}</Typography>
              </StepLabel>
              <StepContent>
                <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50', mb: 2 }}>
                  <Box display="flex" gap={2} mb={2}>
                    {step.icon}
                    <Box flex={1}>
                      <Typography variant="body1" paragraph>
                        {step.description}
                      </Typography>
                      
                      {step.checklist && (
                        <List dense sx={{ bgcolor: 'white', borderRadius: 1, p: 1 }}>
                          {step.checklist.map((item, idx) => (
                            <ListItem key={idx} disableGutters>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <RadioButtonUnchecked fontSize="small" color="action" />
                              </ListItemIcon>
                              <ListItemText 
                                primary={item}
                                primaryTypographyProps={{ variant: 'body2' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Box>
                  </Box>
                  
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={() => handleStepClick(index)}
                    endIcon={<ArrowForward />}
                    sx={{ mt: 2 }}
                  >
                    {step.buttonText}
                  </Button>
                </Paper>
              </StepContent>
            </Step>
          ))}
        </Stepper>
        
        {currentStep === steps.length - 1 && completedSteps.length === steps.length && (
          <Alert severity="success" sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              🎉 Поздравляем! Базовая настройка завершена!
            </Typography>
            <Typography variant="body2">
              Ваш клуб готов к работе. Теперь клиенты могут бронировать корты онлайн.
              После прохождения модерации вы сможете подключить онлайн-оплату.
            </Typography>
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button 
          onClick={handleSkip}
          disabled={loading}
          color="inherit"
        >
          Настроить позже
        </Button>
        {completedSteps.length === steps.length && (
          <Button 
            variant="contained" 
            onClick={completeOnboarding}
            disabled={loading}
          >
            Завершить настройку
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}