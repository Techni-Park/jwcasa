import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  inscriptionId: string;
  type: 'inscription_confirmed' | 'inscription_rejected' | 'inscription_provisional';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inscriptionId, type }: NotificationRequest = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get inscription details with user email
    const { data: inscription, error: inscriptionError } = await supabase
      .from('inscriptions')
      .select(`
        *,
        creneaux(
          date_creneau,
          heure_debut,
          heure_fin,
          type_activite(nom)
        ),
        proclamateurs(
          profiles(
            nom,
            prenom,
            user_id
          )
        )
      `)
      .eq('id', inscriptionId)
      .single();

    if (inscriptionError || !inscription) {
      console.error('Error fetching inscription:', inscriptionError);
      return new Response(
        JSON.stringify({ error: 'Inscription not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get user email from auth.users (using service role key)
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(
      inscription.proclamateurs.profiles.user_id
    );

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Prepare email content based on type
    let subject = '';
    let message = '';
    
    const userFullName = `${inscription.proclamateurs.profiles.prenom} ${inscription.proclamateurs.profiles.nom}`;
    const activityName = inscription.creneaux.type_activite.nom;
    const date = new Date(inscription.creneaux.date_creneau).toLocaleDateString('fr-FR');
    const time = `${inscription.creneaux.heure_debut} - ${inscription.creneaux.heure_fin}`;

    switch (type) {
      case 'inscription_confirmed':
        subject = '✅ Inscription confirmée';
        message = `Bonjour ${userFullName},\n\nVotre inscription pour l'activité "${activityName}" le ${date} de ${time} a été confirmée.\n\nVous pouvez consulter vos inscriptions dans votre espace personnel.\n\nÀ bientôt !`;
        break;
      case 'inscription_rejected':
        subject = '❌ Inscription refusée';
        message = `Bonjour ${userFullName},\n\nNous vous informons que votre inscription pour l'activité "${activityName}" le ${date} de ${time} n'a pas pu être acceptée.\n\nN'hésitez pas à vous inscrire pour d'autres créneaux disponibles.\n\nCordialement`;
        break;
      case 'inscription_provisional':
        subject = '⏰ Inscription provisoire';
        message = `Bonjour ${userFullName},\n\nVotre inscription pour l'activité "${activityName}" le ${date} de ${time} a été mise en statut provisoire.\n\nElle sera automatiquement confirmée 3 jours avant l'activité si aucune autre inscription n'est reçue.\n\nCordialement`;
        break;
    }

    // For now, we'll just log the email that would be sent
    // In production, you would integrate with a service like Resend
    console.log('Email notification:', {
      to: user.email,
      subject,
      message,
      inscriptionDetails: {
        activity: activityName,
        date,
        time,
        status: type
      }
    });

    // Store notification in database for in-app display
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: inscription.proclamateurs.profiles.user_id,
        title: subject,
        message: message,
        type: 'inscription_update',
        read: false,
        metadata: {
          inscription_id: inscriptionId,
          activity_type: activityName,
          date: inscription.creneaux.date_creneau,
          status: type
        }
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully',
        email_logged: true 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Error in send-notification-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);