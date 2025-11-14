# TODO: Implement Diseases Management Module

## 1. Update app.js
- [x] Add route registration for /api/enfermedades

## 2. Update enfermedades.html
- [x] Change title and section to "Administrador de Enfermedades"
- [x] Add two buttons: "Registrar Tipo de Enfermedad" and "Registrar Enfermedad"
- [x] Update search input to "Buscar Enfermedad o Tipo"
- [x] Replace single table with two tables side by side:
  - Left: tipos de enfermedad (ID, Tipo, Editar, Eliminar)
  - Right: enfermedades (ID, Enfermedad, Tipo, Editar, Eliminar)
- [x] Update modals: separate modals for tipo and enfermedad registration/editing

## 3. Implement enfermedades.js
- [x] Load tipos and enfermedades on DOMContentLoaded
- [x] Handle modals for create/edit/delete operations
- [x] Implement real-time validation via AJAX for uniqueness
- [x] Dynamic search filtering both tables
- [x] Populate tipo select in enfermedad modal
- [x] Add pagination for both tipos and enfermedades tables (10 items per page)

## 4. Testing
- [x] Test page load and table population
- [x] Test CRUD operations and modals
- [x] Test search functionality
- [x] Verify authentication and error handling
