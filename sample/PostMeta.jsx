var React = require('react');
var moment = require('moment');
var utils = require('./utils');
var PostDataStore = require('./PostDataStore');
var PostMeta = React.createClass({
    getInitialState: function() {
        return {
            slug:"slug value",
            title:"title value",
            timestamp:0,
            date:'2000/08/31',
            time:'12:44',
            tags:['nothing','no-one'].join(","),
            status:'draft',
        }
    },
    componentWillReceiveProps:function(props) {
        var post = PostDataStore.getSelected();
        if(!post) return;
        console.log("the post is",post);
        var mom = moment.unix(post.timestamp);
        this.setState({
            slug:post.slug,
            title: post.title,
            timestamp:post.timestamp,
            date:mom.format("YYYY/MM/DD"),
            time:mom.format("hh:mm"),
            tags:post.tags?post.tags.join(","):"",
            status:post.status?post.status.toLowerCase():"draft"
        });
    },
    updateSlug: function(e) {
        this.setState({
            slug: e.target.value
        });
    },
    updateTitle: function(e) {
        this.setState({
            title: e.target.value
        })
    },
    updateDate: function(e) {
        this.setState({
            date: e.target.value
        });
        var mom = moment(e.target.value,'YYYY/MM/DD');
        if(mom.isValid()) {
            var oldts = moment.unix(this.state.timestamp);
            oldts.year(mom.year());
            oldts.month(mom.month());
            oldts.date(mom.date());
            this.setState({
                timestamp:oldts.unix()
            })
        }
    },
    updateTime: function(e) {
        this.setState({
            time: e.target.value
        });
        var mom = moment(e.target.value,'hh:mm');
        if(mom.isValid()) {
            var oldts = moment.unix(this.state.timestamp);
            oldts.hour(mom.hour());
            oldts.minute(mom.minute());
            this.setState({
                timestamp:oldts.unix()
            })
        }
    },
    updateTags: function(e) {
        this.setState({
            tags: e.target.value
        });
    },
    setStatusDraft:function() {
        this.setState({
            status:'draft'
        });
        var post = PostDataStore.getSelected();
        if(!post) return;
        PostDataStore.updateStatus(post,'draft');
    },
    setStatusPublished:function() {
        this.setState({
            status:'published'
        });
        var post = PostDataStore.getSelected();
        if(!post) return;
        PostDataStore.updateStatus(post,'published');
    },
    updateModel: function(e) {
        var post = PostDataStore.getSelected();
        if(!post) return;
        PostDataStore.updateSlug(post,this.state.slug);
        PostDataStore.updateTitle(post,this.state.title);
        PostDataStore.updateTags(post,this.state.tags);
    },
    render: function() {
        if(!this.props.post|| !this.props.post.format) {
            var format = "unknown";
        } else {
            var format = this.props.post.format;
        }
        var timestamp = moment.unix(this.state.timestamp).format("dddd, YYYY MMM DD - hh:mm A");
        if(this.props.post && this.props.post.tags) {
            var tags = this.props.post.tags.join(" - ");
        } else {
            var tags = "";
        }
        return <div id="post-meta"
                style={{display:this.props.zen?'none':'block'}}
            >
            <form className='form-horizontal'>
                <div className='form-group'>
                    <label className='col-sm-2 control-label'>slug</label>
                    <div className="col-sm-9">
                        <input className='form-control' type='text' value={this.state.slug} onChange={this.updateSlug} onBlur={this.updateModel}/>
                    </div>
                </div>
                <div className='form-group'>
                    <label className='col-sm-2 control-label'>title</label>
                    <div className="col-sm-9">
                        <input className='form-control' type='text' value={this.state.title} onChange={this.updateTitle} onBlur={this.updateModel}/>
                    </div>
                </div>
                <div className='form-group'>
                    <label className='col-sm-2 control-label'>tags</label>
                    <div className="col-sm-5">
                        <input className='form-control' type='text' value={this.state.tags} onChange={this.updateTags} onBlur={this.updateModel}/>
                    </div>
                    <label className='col-sm-5'>{tags}</label>
                </div>
                <div className='form-group'>
                    <label className='col-sm-2 control-label'>timestamp</label>
                    <div className="col-sm-3">
                        <input className='form-control' type='text' value={this.state.date} onChange={this.updateDate} onBlur={this.updateModel}/>
                    </div>
                    <div className="col-sm-2">
                        <input className='form-control' type='text' value={this.state.time} onChange={this.updateTime} onBlur={this.updateModel}/>
                    </div>
                    <div className="col-sm-5">
                        <label>{timestamp}</label>
                    </div>
                </div>
                <div className='form-group'>
                    <label className='col-sm-2 control-label'>format</label>
                    <label className='col-sm-2 control-label'>{format}</label>
                </div>
                <div className='form-group'>
                    <label className='col-sm-2 control-label'>status</label>
                    <button
                        className={utils.toClass(['btn','btn-default'],{active:this.state.status=='draft'})}
                        onClick={this.setStatusDraft}
                        >Draft</button>
                    <button
                        className={utils.toClass(['btn','btn-default'],{active:this.state.status=='published'})}
                        onClick={this.setStatusPublished}
                        >Published</button>
                </div>
            </form>
        </div>
    }
});
module.exports = PostMeta;