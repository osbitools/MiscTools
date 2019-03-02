Miscellaneous tools to support OsBiTools projects

## Presentation Playback

This is the minimized version of BigBlueButton (http://bigbluebutton.org/) playback module.
It support only presentations with slides, cursor and MP3 audio.
This library is suitable for embedded project.
layout of presentation playback automatically adjusting to the boundaries of parent container.

Dependencies 
 - jquery 1.10.2
 - popcorn-complete 1.5.6

Initial presentation needs to be located in relative path /presentations/${mid}/ (default)
where ${mid} is meeting id

Example of embedded presentation can be found here - http://www.osbitools.com/blog/presentation-system-overview

## Evaluation Client Manager

Simple framework written in Ajax to help manage evaluation users. This is only Front End and required supporting web service /clients. To mock output this version include mock file clients with 2 demo client. To make front end running copy/rename template file and make appropriate changes in product description (product.js) and email template (client_email.html.template)

cp js/product.js.template product.js
cp client_email.html.template client_email.html

Current version of client manager including next features:

- Automatically set expiration day from XX days from now (30 days in template)
- Automatically generate/regenerate random password of XX length (6 characters in template).
Password include at least 1 Latin uppercase letter, at least one number, one special letter from ~!@#$%&*+= and 
rest of lowercase Latin characters.
- Substitute dynamic parameters in email template

Screenshots:

![Adding new evaluation client](http://www.osbitools.com/sites/default/files/ecm/AddClientBase.png)

Adding new evaluation client



![Verify and confirm email](http://www.osbitools.com/sites/default/files/ecm/VerifyEmail.png)

Verify and confirm email



![Save client](http://www.osbitools.com/sites/default/files/ecm/ConfirmClient.png)

Added client

