-- 1. Crea o aggiorna la funzione che estrae il tenant_id dai metadati
CREATE OR REPLACE FUNCTION extract_tenant_id_from_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Se il tenant_id è presente nei metadati, copialo nella successiva colonna (o inseriscilo al momento della creazione del record)
  IF NEW.metadata ? 'tenant_id' THEN
    NEW.tenant_id := NEW.metadata->>'tenant_id';
  END IF;
  
  -- Rimuovi il tenant_id dai metadata per evitare duplicazioni (opzionale ma consigliato per pulizia)
  -- NEW.metadata := NEW.metadata - 'tenant_id';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Elimina il trigger se già esistente
DROP TRIGGER IF EXISTS trg_extract_tenant_id ON zirel_vectors;

-- 3. Crea il trigger sulla tabella zirel_vectors prima di ogni INSERIMENTO
CREATE TRIGGER trg_extract_tenant_id
BEFORE INSERT ON zirel_vectors
FOR EACH ROW
EXECUTE FUNCTION extract_tenant_id_from_metadata();
