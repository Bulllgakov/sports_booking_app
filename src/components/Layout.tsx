import React from 'react'
import { Outlet } from 'react-router-dom'
import { Box } from '@mui/material'
import DemoAdminLayout from '../layouts/DemoAdminLayout'
import { useDemoAuth } from '../contexts/DemoAuthContext'

const Layout: React.FC = () => {
  const { admin } = useDemoAuth()

  if (!admin) {
    return <Box>Loading...</Box>
  }

  return <DemoAdminLayout />
}

export default Layout