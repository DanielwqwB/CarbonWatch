const express = require('express');
const router = express.Router();
const establishmentController = require('../controllers/establishmentController');

// Routes
router.get('/', establishmentController.getAllEstablishments);          // GET all
router.get('/:id', establishmentController.getEstablishmentById);      // GET by ID
router.post('/create/establishment', establishmentController.createEstablishment);          // CREATE
router.put('/:id', establishmentController.updateEstablishment);       // UPDATE
router.delete('/:id', establishmentController.deleteEstablishment);    // DELETE

module.exports = router;
