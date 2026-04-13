import request from './api_index'

export const submitReport = (data) => request.post('/api/reports', data)
