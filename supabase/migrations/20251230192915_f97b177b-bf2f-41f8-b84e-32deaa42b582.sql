-- Assign admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('f2e82bb4-a9e7-43b4-bbf9-4617ffa7aba7', 'admin');

-- Assign scanner role
INSERT INTO public.user_roles (user_id, role)
VALUES ('c9c81415-5b3d-4f5a-9e4d-21ba6f86f401', 'scanner');