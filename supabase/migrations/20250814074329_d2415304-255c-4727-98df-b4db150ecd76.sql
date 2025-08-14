-- Add missing updated_at column to type_activite table
ALTER TABLE public.type_activite 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_type_activite_updated_at
    BEFORE UPDATE ON public.type_activite
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();