
\c aolf_gsec

\dt
\dt+

SELECT * FROM users;

SELECT * FROM aolf_gsec.appointments;

SELECT * FROM aolf_gsec.users WHERE email = 'test@test.com';

-- Show all possible values for the enum
select enum_range(null::attendancestatus)

select enum_range(null::personrelationshiptype)

