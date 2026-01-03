-- Add contact_submissions to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE contact_submissions;

-- Enable full replica identity for complete row data
ALTER TABLE contact_submissions REPLICA IDENTITY FULL;