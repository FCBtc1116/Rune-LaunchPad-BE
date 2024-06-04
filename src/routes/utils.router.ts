import { Router } from 'express';
// Corrected import statement to match default export
import utils from '../controllers/utils.controller';
import cacheMiddleware from '../middlewares/cacheMiddleware';

const router = Router();

router.get('/btcUsd', cacheMiddleware, utils.getBTCUSD);
router.get('/recommended', cacheMiddleware, utils.getRecommendedFees);

/**
 * @openapi
 * /utils/btcUsd:
 *   get:
 *     summary: Get BTC to USD price
 *     description: Retrieves the current Bitcoin price in USD.
 *     tags:
 *       - Bitcoin Utilities
 *     responses:
 *       200:
 *         description: BTC to USD price retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 price:
 *                   type: number
 *                   format: float
 *                   description: Current price of Bitcoin in USD.
 *       400:
 *         description: Error retrieving BTC to USD price.
 * 
 * /utils/recommended:
 *   get:
 *     summary: Get recommended fees
 *     description: Retrieves recommended fees for Bitcoin transactions.
 *     tags:
 *       - Bitcoin Utilities
 *     responses:
 *       200:
 *         description: Recommended fees retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fast:
 *                   type: integer
 *                   description: Fee rate (sat/vB) for fast transaction confirmation.
 *                 medium:
 *                   type: integer
 *                   description: Fee rate (sat/vB) for medium-speed transaction confirmation.
 *                 slow:
 *                   type: integer
 *                   description: Fee rate (sat/vB) for slow transaction confirmation.
 *       400:
 *         description: Error retrieving recommended fees.
 */

export default router;
