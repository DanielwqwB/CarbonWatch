const express = require('express');
const router = express.Router();
const establishmentController = require('../controllers/establishmentController');

// Routes
router.get('/establishment', establishmentController.getAllEstablishments);          // GET establishment/
router.get('/establishment/:id', establishmentController.getEstablishmentById);      // GET by ID establishment/1
router.post('/create/establishment', establishmentController.createEstablishment); // CREATE establishment/create
router.put('/establihsment/:id', establishmentController.updateEstablishment);       // UPDATE    establishment/1
router.delete('/establishment/:id', establishmentController.deleteEstablishment);    // DELETE establishment/1

module.exports = router;
