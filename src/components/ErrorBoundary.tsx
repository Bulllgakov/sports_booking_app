import React, { Component, ReactNode } from 'react'
import { Box, Typography, Button, Paper } from '@mui/material'
import { ErrorOutline, Refresh } from '@mui/icons-material'
import { handleError, logError, AppError } from '../utils/errorHandler'

interface Props {
  children: ReactNode
  fallback?: (error: AppError, reset: () => void) => ReactNode
}

interface State {
  hasError: boolean
  error?: AppError
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    const appError = handleError(error)
    return { hasError: true, error: appError }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const appError = handleError(error)
    logError(appError, { 
      componentStack: errorInfo.componentStack,
      errorBoundary: true 
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Если передан кастомный fallback
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset)
      }

      // Дефолтный UI для ошибки
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            p: 3
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 500,
              textAlign: 'center'
            }}
          >
            <ErrorOutline 
              sx={{ 
                fontSize: 64, 
                color: 'error.main',
                mb: 2
              }} 
            />
            
            <Typography variant="h5" gutterBottom>
              Что-то пошло не так
            </Typography>
            
            <Typography 
              variant="body1" 
              color="text.secondary" 
              paragraph
            >
              {this.state.error.message}
            </Typography>

            {process.env.NODE_ENV === 'development' && this.state.error.code && (
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  display: 'block',
                  mt: 2,
                  p: 1,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  fontFamily: 'monospace'
                }}
              >
                Код ошибки: {this.state.error.code}
              </Typography>
            )}

            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={this.handleReset}
              sx={{ mt: 3 }}
            >
              Попробовать снова
            </Button>
          </Paper>
        </Box>
      )
    }

    return this.props.children
  }
}

// HOC для оборачивания компонентов
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: (error: AppError, reset: () => void) => ReactNode
): React.ComponentType<P> {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}