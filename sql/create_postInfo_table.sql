CREATE TABLE postInfo (
	id SERIAL PRIMARY KEY, 
	email VARCHAR(100) NOT NULL,
	title TEXT NOT NULL,
	body TEXT NOT NULL,
	topic VARCHAR(25) NOT NULL,
	date DATE,
	FOREIGN KEY (email) REFERENCES loginCredentials(email);
);