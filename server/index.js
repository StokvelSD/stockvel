const express = require('express')
const cors = require('cors')
const groupRoutes = require('./routes/groups')

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/groups', groupRoutes)

app.listen(5000, () => console.log('Server running on port 5000'))