import React, { useEffect, useState } from 'react'
import { Box, Card, CardContent, Typography } from '@mui/material'
import { useAuth } from '../../contexts/AuthContext'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'

export default function Debug() {
  const { user } = useAuth()
  const [adminInfo, setAdminInfo] = useState<any>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user?.email) {
        setError('No user logged in')
        return
      }

      try {
        const adminQuery = query(collection(db, 'admins'), where('email', '==', user.email))
        const adminSnapshot = await getDocs(adminQuery)
        
        if (!adminSnapshot.empty) {
          const adminDoc = adminSnapshot.docs[0]
          setAdminInfo({
            id: adminDoc.id,
            data: adminDoc.data(),
            exists: true
          })
        } else {
          setAdminInfo({
            exists: false,
            searchedEmail: user.email
          })
        }
      } catch (err: any) {
        setError(err.message)
      }
    }

    checkAdmin()
  }, [user])

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Debug Information</Typography>
      
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">Current User</Typography>
          <pre>{JSON.stringify(user, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">Admin Search Result</Typography>
          <pre>{JSON.stringify(adminInfo, null, 2)}</pre>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent>
            <Typography variant="h6" color="error">Error</Typography>
            <Typography>{error}</Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}