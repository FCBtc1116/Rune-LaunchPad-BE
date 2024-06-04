import { Router } from 'express'
import * as JwtController from '../controllers/jwt.controller'

const router = Router()

router.post('/jwt', JwtController.signJwt) // For verifying and re-signing JWT
router.post('/signedjwt', JwtController.verifySignedJwt) // For verifying and re-signing JWT

export default router