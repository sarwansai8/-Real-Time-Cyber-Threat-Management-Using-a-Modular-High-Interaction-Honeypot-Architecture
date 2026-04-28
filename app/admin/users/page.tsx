'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Users, Search, UserCheck, UserX, Shield, Clock, 
  Mail, Phone, Calendar, MapPin, Download 
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface User {
  _id: string
  email: string
  firstName: string
  lastName: string
  role: string
  phone: string
  city: string
  state: string
  createdAt: string
  verified: boolean
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'admin' | 'patient' | 'verified'>('all')
  const [stats, setStats] = useState({
    total: 0,
    admins: 0,
    patients: 0,
    verified: 0
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, filter])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
        
        // Calculate stats
        const total = data.users.length
        const admins = data.users.filter((u: User) => u.role === 'admin').length
        const patients = data.users.filter((u: User) => u.role === 'patient').length
        const verified = data.users.filter((u: User) => u.verified).length
        
        setStats({ total, admins, patients, verified })
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = [...users]

    // Apply role filter
    if (filter === 'admin') {
      filtered = filtered.filter(u => u.role === 'admin')
    } else if (filter === 'patient') {
      filtered = filtered.filter(u => u.role === 'patient')
    } else if (filter === 'verified') {
      filtered = filtered.filter(u => u.verified)
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(search) ||
        u.firstName.toLowerCase().includes(search) ||
        u.lastName.toLowerCase().includes(search) ||
        u.phone.includes(search)
      )
    }

    setFilteredUsers(filtered)
  }

  const exportUsers = () => {
    const csv = [
      ['Email', 'Name', 'Role', 'Phone', 'Location', 'Verified', 'Joined'].join(','),
      ...filteredUsers.map(u =>
        [
          u.email,
          `${u.firstName} ${u.lastName}`,
          u.role,
          u.phone,
          `${u.city}, ${u.state}`,
          u.verified ? 'Yes' : 'No',
          new Date(u.createdAt).toLocaleDateString()
        ].join(',')
      )
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <LoadingSpinner message="Loading users..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">Manage portal users and permissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setFilter('all')}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Total Users</p>
                <p className="text-2xl font-bold text-foreground mt-2">{stats.total}</p>
              </div>
              <Users className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 cursor-pointer hover:border-secondary/50 transition-colors"
              onClick={() => setFilter('admin')}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Administrators</p>
                <p className="text-2xl font-bold text-foreground mt-2">{stats.admins}</p>
              </div>
              <Shield className="w-5 h-5 text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 cursor-pointer hover:border-blue-500/50 transition-colors"
              onClick={() => setFilter('patient')}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Patients</p>
                <p className="text-2xl font-bold text-foreground mt-2">{stats.patients}</p>
              </div>
              <UserCheck className="w-5 h-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 cursor-pointer hover:border-green-500/50 transition-colors"
              onClick={() => setFilter('verified')}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Verified</p>
                <p className="text-2xl font-bold text-foreground mt-2">{stats.verified}</p>
              </div>
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setFilter('all')}>
                All
              </Button>
              <Button variant="outline" size="sm" onClick={() => setFilter('patient')}>
                Patients
              </Button>
              <Button variant="outline" size="sm" onClick={() => setFilter('admin')}>
                Admins
              </Button>
              <Button variant="outline" size="sm" onClick={exportUsers}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Users Table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>All Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            {filter !== 'all' && `Filtered by: ${filter}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserX className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No users found matching your criteria</p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {user.firstName[0]}{user.lastName[0]}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">
                          {user.firstName} {user.lastName}
                        </h3>
                        {user.role === 'admin' && (
                          <Badge variant="secondary" className="text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        {user.verified && (
                          <Badge variant="default" className="text-xs bg-green-600">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {user.phone}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {user.city}, {user.state}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <Calendar className="w-3 h-3" />
                        Joined {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
                      View Details
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Review account information for the selected portal user.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="font-medium">{selectedUser.firstName} {selectedUser.lastName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="font-medium capitalize">{selectedUser.role}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium break-all">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedUser.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedUser.city}, {selectedUser.state}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Verified</p>
                  <p className="font-medium">{selectedUser.verified ? 'Yes' : 'No'}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="font-medium">{new Date(selectedUser.createdAt).toLocaleString()}</p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedUser.email)
                    setSelectedUser(null)
                  }}
                >
                  Copy Email
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setSelectedUser(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
