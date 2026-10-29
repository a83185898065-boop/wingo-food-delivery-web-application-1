import express from 'express';
import {
    createCustomerOrder,
    acceptDeliveryOrder,
    assignOwnerOrder,
    getAvailableMenu,
    getCustomerOrders,
    getDeliveryBoyOrders,
    getOwnerDeliveryBoys,
    getOwnerOrders,
    getOwnerPendingCount,
    updateOwnerOrderStatus,
    updateDeliveryOrderLocation,
    verifyRazorpayPayment,
} from '../controllers/order.controllers.js';
import isAuth from '../middlewares/isAuth.js';

const orderRouter = express.Router();

orderRouter.get('/menu', getAvailableMenu);
orderRouter.post('/', isAuth, createCustomerOrder);
orderRouter.post('/verify-payment', isAuth, verifyRazorpayPayment);
orderRouter.get('/customer/mine', isAuth, getCustomerOrders);
orderRouter.get('/owner/pending-count', isAuth, getOwnerPendingCount);
orderRouter.get('/owner/delivery-boys', isAuth, getOwnerDeliveryBoys);
orderRouter.get('/owner/mine', isAuth, getOwnerOrders);
orderRouter.get('/delivery/mine', isAuth, getDeliveryBoyOrders);
orderRouter.post('/delivery/:orderId/accept', isAuth, acceptDeliveryOrder);
orderRouter.patch('/delivery/:orderId/location', isAuth, updateDeliveryOrderLocation);
orderRouter.post('/owner/:orderId/assign', isAuth, assignOwnerOrder);
orderRouter.patch('/owner/:orderId/status', isAuth, updateOwnerOrderStatus);

export default orderRouter;
