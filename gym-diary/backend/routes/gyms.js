const express = require('express');
const router = express.Router();

const {
    getMyGym,
    upsertMyGym,
    getMyGymMembers,
    addMyGymMember,
    removeMyGymMember
} = require('../controllers/gymController');

router.get('/me', getMyGym);
router.put('/me', upsertMyGym);
router.get('/me/members', getMyGymMembers);
router.post('/me/members', addMyGymMember);
router.delete('/me/members/:id', removeMyGymMember);

module.exports = router;
