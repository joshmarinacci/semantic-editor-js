/**
 * Created by josh on 7/20/15.
 */


//list of posts. nothing to save

var posts = [
    {
        id:'id_foo1',
        slug:"testpost1",
        title:"Test Post 1",
        content: [
            {
                type:"root",
                content: [
                    {
                        type:'block',
                        style:'body',
                        content: [
                            {
                                type:'text',
                                text:'my cool text'
                            },
                            {
                                type:'span',
                                style:'bold',
                                content:[
                                    {
                                        type:'text',
                                        text:"bold text"
                                    }
                                ]
                            },
                            {
                                type:'text',
                                text:"more plain text"
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id:"id_foo2",
        slug:"testpost2",
        title:"Test Post 2",
        content: [
            {
                type:'root',
                content: [
                    {
                        type:'block',
                        style:'body',
                        content: [
                            {
                                type:'text',
                                text:"another post"
                            }
                        ]
                    }
                ]
            }
        ]
    }
];


