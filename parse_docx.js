const mammoth = require('mammoth');

mammoth.extractRawText({path: '/sessions/happy-trusting-dijkstra/mnt/uploads/rewritten_resume.docx'})
    .then(result => {
        console.log(result.value);
    })
    .catch(err => {
        console.error(err);
    });
